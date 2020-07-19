/** @jsx h */
import { h } from 'preact'
import { useState, useContext, useEffect } from 'preact/hooks'
import { ContextMenu, EventTestHelper, classNames, count, route, truncate } from '../lib'
import { AppContext } from '../app/index'
import { ItemContextMenu } from './context_menu'
import { move, openURL, toggleSelect } from './actions'

export const Item = ({
  activeId = null,
  expandable = false,
  item,
  onClick = null,
  showMenuButton = false,
}) => {
  const [expanded, setExpanded] = useState(false)
  const [menuCoords, setMenuCoords] = useState(null)

  const app = useContext(AppContext)
  const changes = app.changesById[item.id]
  if (changes) Object.assign(item, changes)
  if (item.removed) return null

  return <Wrapper app={app} item={item}>
    <Body
      activeId={activeId}
      app={app}
      expandable={expandable}
      item={item}
      onClick={onClick}
      setMenuCoords={setMenuCoords}
      showingMenu={!!menuCoords}
    >
      <Icon
        app={app}
        expandable={expandable}
        item={item}
        expanded={expanded}
        setExpanded={setExpanded}
      />

      <Name item={item} />

      <Info item={item} />

      {showMenuButton && <ItemMenuButton
        active={!!menuCoords}
        setMenuCoords={setMenuCoords}
      />}
    </Body>

    {expanded && <Item.List
      activeId={activeId}
      expandable={expandable}
      items={item.children}
    />}

    {menuCoords && <ItemContextMenu
      coords={menuCoords}
      item={item}
      setCoords={setMenuCoords}
    />}
  </Wrapper >
}

const Wrapper = ({ app, children, item }) =>
  <div
    className={classNames({
      item: true,
      cut: app.idsToCut.includes(item.id),
      selected: app.selectedIds.includes(item.id),
    })}
    {...dragAndDropBehavior({ item, selectedIds: app.selectedIds })}
  >
    {children}
  </div>

const Body = ({
  app,
  activeId,
  children,
  expandable,
  item,
  onClick,
  setMenuCoords,
  showingMenu,
}) => {
  const [touchEvent, setTouchEvent] = useState(false)
  const markEventAsTouchEvent = () => setTouchEvent(true)

  const active = item.id === activeId || showingMenu

  const openItem = () => {
    if (ContextMenu.closeAll()) return
    else if (item.type === 'folder') route(`/folders/${item.id}`)
    else if (item.type === 'url') openURL(item.url)
  }

  return <a
    className={classNames({ 'item-body': true, active })}
    href={item.url || `/#/folders/${item.id}`}
    onClick={(event) => {
      // use href attribute if any new tab / window modifier is pressed
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
        event.button !== 0) return

      event.preventDefault()

      // use custom onClick handler if given
      if (onClick) return onClick(event, item)

      // open item directly on touch or if it is expandable (i.e. in tree view)
      if (expandable || touchEvent) {
        if (touchEvent) setTouchEvent(false)
        openItem()
      }
      // regular mouse click outside tree => toggle selection state
      else {
        toggleSelect({ item, ...app })
      }
    }}
    onContextMenu={(event) => {
      event.preventDefault()
      if (touchEvent) { // this is actually a long press / hard touch event
        toggleSelect({ item, ...app })
      }
      else { // this is a right click
        setMenuCoords([event.x, event.y])
      }
    }}
    onDblClick={onClick ? undefined : openItem}
    onTouchStart={markEventAsTouchEvent}
  >
    {children}
    <EventTestHelper target={item.name} touchstart={markEventAsTouchEvent} />
  </a>
}

const Icon = ({ app, expandable, expanded, item, setExpanded, }) => {
  const selected = app.selectedIds.includes(item.id)
  const faviconSource = app.user && app.user.settings.faviconSource

  let accessory = null
  if (selected) accessory = '✓'
  else if (expandable && item.children.length) accessory = expanded ? '▼' : '▶'

  return <div onClick={(event) => {
    if (selected) {
      event.preventDefault()
      event.stopPropagation()
      toggleSelect({ item, ...app })
    }
    else {
      setExpanded(!expanded)
    }
  }}>
    <div className={classNames({
      'item-accessory': true,
      'item-expansion-toggle': expandable,
    })}>
      {accessory}
    </div>
    <div className='item-icon' role='img' aria-label='Icon'>
      {item.type === 'folder' ?
        <FolderIcon /> :
        <URLIcon faviconSource={faviconSource} url={item.url} />}
    </div>
  </div>
}

// replacement for U+1F5BF BLACK FOLDER, which is not available everywhere yet
const FolderIcon = () =>
  <svg fill='currentColor' viewBox='0 160 500 200'>
    <g>
      <path stroke='none' d='M 259.7344,369.5625 H 28.5469 V 196.0312 l 18.5625,-27.9843 h 57.5156 l 17.0156,27.9843 h 138.0938 z' />
    </g>
  </svg>

const URLIcon = ({ faviconSource, url }) => {
  const [favicon, setFavicon] = useState(null)
  useEffect(() => {
    let parsed
    try { parsed = new URL(url) } catch (e) { }
    if (parsed && /^http/.test(parsed.protocol)) {
      const imagePreloader = new Image()
      imagePreloader.onload = () => setFavicon(imagePreloader.src)
      const load = (src) => imagePreloader.src = src
      if (faviconSource === 'ddg')
        load(`https://icons.duckduckgo.com/ip3/${parsed.host}.ico`)
      else if (faviconSource === 'google')
        load(`https://www.google.com/s2/favicons?domain=${parsed.host}&sz=32`)
      else if (faviconSource === 'origin')
        load(`${parsed.origin}/favicon.ico`)
    }
  }, [faviconSource, setFavicon, url])

  if (favicon) {
    return <img alt='Favicon' className='favicon' src={favicon} />
  }
  else {
    // fallback if url is unparsable or favicon not loaded yet or inexistent
    return <span>★</span>
  }
}

const Name = ({ item }) =>
  <div className='item-name'>{item.name}</div>

const Info = ({ item }) =>
  <div className='item-info'>{item.info || item.url}</div>

const ItemMenuButton = ({ active, setMenuCoords }) => {
  // can not use css hover, as it is not cleared in some cases on touch devices
  const [hover, setHover] = useState(false)

  return <span
    className={classNames({ 'item-menu-button': true, active: active || hover })}
    onClick={(event) => {
      ContextMenu.closeAll()
      setMenuCoords([event.x, event.y])
      setHover(false)
      // do not select or open the item
      event.preventDefault()
      event.stopPropagation()
    }}
    onMouseEnter={() => hover === null || setHover(true)}
    onMouseLeave={() => hover === null || setHover(false)}
    onTouchStart={(event) => {
      setHover(null)
      event.stopPropagation()
    }}
  >
    ⋮
  </span>
}

// TODO: add drop zone to support moving stuff to root
const dragAndDropBehavior = ({ item, selectedIds }) => {
  if (item.type === 'url') return draggableBehavior({ item, selectedIds })
  else if (item.type === 'folder') return {
    ...draggableBehavior({ item, selectedIds }),
    ...dropTargetBehavior({ item }),
  }
}

const draggableBehavior = ({ item, selectedIds }) => ({
  draggable: true,
  onDragStart: (e) => {
    // we are moving, not copying, but 'move' doesn't show a helpful cursor
    e.dataTransfer.effectAllowed = 'copy'

    // move the whole current selection if the dragged item is part of it,
    // else move only the dragged item itself.
    const ids = selectedIds.includes(item.id) ? selectedIds : [item.id]
    e.dataTransfer.setData('application/json', JSON.stringify(ids))

    // this allows dragging into, e.g., a browser's tab bar to open a new tab
    item.url && e.dataTransfer.setData('text/uri-list', item.url)

    // show a preview while dragging
    const text = ids.length === 1 ?
      `${truncate(item.name, 20)}` :
      `[${ids.length} items]`
    const view = buildDragPreview({ text })
    e.dataTransfer.setDragImage(view, 0, view.height)
  }
})

const buildDragPreview = ({ text }) => {
  // render at 2x res to avoid blur
  const width = 360
  const height = parseInt(prototypeStyle('.item', 'height')) * 2

  const view = document.createElement('canvas')
  view.id = 'dragview'
  view.height = height
  view.width = width
  view.style.height = `${height / 2}px`
  view.style.width = `${width / 2}px`

  const ctx = view.getContext('2d')
  ctx.fillStyle = prototypeStyle('body', 'background-color')
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = prototypeStyle('.item-name', 'color')
  ctx.font = `${height / 2}px ${prototypeStyle('.item-name', 'font-family')}`
  ctx.fillText(text, 10, height / 1.5, width - 20)
  document.querySelectorAll(`#${view.id}`).forEach((e) => e.remove())
  document.body.append(view)

  return view
}

const dropTargetBehavior = ({ item }) => ({
  onDragEnter: (e) => e.dataTransfer.dropEffect = 'copy',
  onDragLeave: (e) => e.dataTransfer.dropEffect = 'none',
  onDragOver: (e) => e.preventDefault(), // needed. this WHATWG spec is weird.
  onDrop: (e) => {
    e.preventDefault() // prevents click event on drag start point in Firefox
    const ids = JSON.parse(e.dataTransfer.getData('application/json'))
    if (ids && !ids.includes(item.id) && window.confirm(
      `Move ${count('item', ids.length)} into "${item.name}"?`
    )) {
      move({ ids, intoFolderId: item.id })
    }
  }
})

const prototypeStyle = (selector, attr) =>
  getComputedStyle(document.querySelector(selector)).getPropertyValue(attr)

Item.List = ({ items, ...itemProps }) =>
  <div className='item-list'>
    {items && items.map((item) => <Item item={item} {...itemProps} />)}
  </div>

Item.sort = (items) =>
  items.sort((itemA, itemB) =>
    Intl.Collator().compare(
      `${itemA.type}${itemA.name}`, `${itemB.type}${itemB.name}`
    )
  )

Item.typeName = (type) => {
  if (type === 'url') return 'bookmark'
  if (type === 'folder') return 'folder'
  throw new Error(`unknown item type "${type}"`)
}
