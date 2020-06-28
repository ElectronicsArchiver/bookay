/// <reference path="../../support/index.d.ts" />

context('Mobile view', () => {
  beforeEach(() => cy.viewport(320, 568))

  it('allows navigating folders via a dropdown', () => {
    cy.createItem({
      type: 'folder', name: 'Folder 1', children: [
        { type: 'folder', name: 'Folder in folder' }
      ]
    })

    cy.visit('/')
    cy.shouldHaveItem('Folder 1')
    cy.shouldNotHaveItem('Folder in folder')

    cy.get('select').select('Folder 1')
    cy.shouldHaveItem('Folder in folder')
  })

  it('opens touched folders and URLs immediately', () => {
    cy.createItem({
      type: 'folder', name: 'Folder 1', children: [
        { type: 'folder', name: 'Inner folder' }
      ]
    })

    cy.visit('/')

    cy.shouldHaveItem('Folder 1')
    cy.shouldNotHaveItem('Inner folder')
    cy.window().then(win => {
      win.postMessage({ testEvent: 'touchstart', target: 'Folder 1' }, null)
      win.postMessage({ testEvent: 'touchend', target: 'Folder 1' }, null)
    })
    cy.item('Folder 1').click()
    cy.shouldHaveItem('Inner folder')
  })

  it('toggles item selection state on long press', () => {
    cy.createItem({ type: 'folder', name: 'Folder 1' })

    cy.visit('/')

    cy.item('Folder 1').should('not.have.class', 'selected')

    // first long press: select
    cy.window().then(win => {
      win.postMessage({ testEvent: 'touchstart', target: 'Folder 1' }, null)
      cy.wait(1000)
      win.postMessage({ testEvent: 'touchend', target: 'Folder 1' }, null)
    })
    cy.item('Folder 1').click()

    cy.item('Folder 1').should('have.class', 'selected')

    // second long press: deselect
    cy.window().then(win => {
      win.postMessage({ testEvent: 'touchstart', target: 'Folder 1' }, null)
      cy.wait(1000)
      win.postMessage({ testEvent: 'touchend', target: 'Folder 1' }, null)
    })
    cy.item('Folder 1').click()

    cy.item('Folder 1').should('not.have.class', 'selected')
  })
})
