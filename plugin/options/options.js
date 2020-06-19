import { ApiClient, Configuration } from '../shared/index.js'

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.querySelector('form')
  const submitButton = form.querySelector('button')

  const renderFormField = ({ defaultValue, title, ...inputAttributes }) => {
    const el = Object.assign(document.createElement('div'), { className: 'field' })
    el.innerHTML = `<label><div class="label-text">${title}</div></label>`
    const input = Object.assign(document.createElement('input'), inputAttributes)
    el.querySelector('label').append(input)
    form.insertBefore(el, submitButton)
  }

  Configuration.fields.forEach(renderFormField)

  const getEnteredValues = () =>
    [...document.querySelectorAll('input')].reduce((a, e) => (
      { ...a, [e.id]: e.type === 'checkbox' ? e.checked : e.value }
    ), {})

  const saveValues = (event) => {
    event.preventDefault()
    Configuration.save(getEnteredValues())
  }

  const restoreValues = async () => {
    const config = await Configuration.load()
    Configuration.fields.forEach(({ defaultValue, id, type }) => {
      const element = document.getElementById(id)
      const value = config[id]
      if (type === 'checkbox') {
        element.checked = value === undefined ? defaultValue : value
      } else {
        element.value = value || defaultValue
      }
    })
  }

  await restoreValues()

  form.addEventListener('submit', saveValues)

  document.getElementById('logoutButton').addEventListener('click', (event) => {
    event.preventDefault()
    const msg = document.getElementById('logoutMessage')
    const client = new ApiClient(getEnteredValues())
    client.logout()
      .then((_res) => msg.innerHTML = '😊 Logged out!')
      .catch((err) => msg.innerHTML = `😕 Error logging out. ${err.message}`)
  })
})
