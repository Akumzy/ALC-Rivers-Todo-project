const template = ({ text = '', done = false, editMode = true, id } = {}) => ({
    id,
    done,
    editMode,
    type: 'div',
    attributes: { class: 'list' },
    text,
    children: [
      {
        type: 'div',
        attributes: {
          class: 'list-content',
          contenteditable: editMode,
          autofocus: editMode
        },
        events: {
          input: function(_, obj) {
            obj.text = this.textContent
            // We don't want remove focus on the input field
            // so we're just go update our database directly
            // without rerendering the DOM elements
            saveToDB(storage)

          },
          blur: function(_, obj) {
            this.setAttribute('contenteditable', false)
            obj.editMode = false
            saveToDB(storage)
          },
          dblclick: function(_, obj) {
            if (!obj.editMode) {
              this.setAttribute('contenteditable', true)
              obj.editMode = true
              if (obj.editMode) setTimeout(() => this.focus(), 0)
            }
          }
        },
        init: function(_, obj) {
          this.setAttribute('contenteditable', obj.editMode)
          this.textContent = obj.text
          if (obj.editMode) setTimeout(() => this.focus(), 0)
        }
      },
      {
        type: 'div',
        attributes: {
          class: 'list-actions'
        },
        children: [
          {
            type: 'div',
            children: [
              {
                type: 'span',
                attributes: {
                  class: 'action-btn mdi mdi-pen',
                  edit: '',
                  title: 'Edit'
                },
                events: {
                  click(_, obj) {
                    obj.editMode = true
                    storage[obj.id] = obj
                  }
                }
              },
              {
                type: 'span',
                attributes: {
                  class: 'action-btn mdi mdi-trash-can-outline',
                  delete: '',
                  title: 'Delete'
                },
                events: {
                  click(_, obj) {
                    delete storage[obj.id]
                  }
                }
              }
            ]
          },
          {
            type: 'div',
            children: [
              {
                type: 'span',
                attributes: {
                  class: 'action-btn mdi mdi-checkbox-blank-circle-outline' + (done ? ' active' : ''),
                  checkbox: ''
                },
                events: {
                  click(parent, obj) {
                    obj.done = !obj.done
                    obj.editMode = false
                    this.classList[obj.done ? 'add' : 'remove']('active')
                    parent.classList[obj.done ? 'add' : 'remove']('is-completed')
                    saveToDB(storage)
                  }
                },

                init: function(parent, obj) {
                  this.classList[obj.done ? 'add' : 'remove']('active')
                  parent.classList[obj.done ? 'add' : 'remove']('is-completed')
                }
              }
            ]
          }
        ]
      }
    ]
  }),
  /**We're going to use this obj to keep track of our DOM elements */
  nodes = {},
  months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ],
  weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  db = {}

// Storage
var storage = new Proxy(db, {
    get: function(objectTarget, key) {
      return objectTarget[key]
    },
    set: function(objectTarget, key, value) {
      objectTarget[key] = value
      hook(value, key)
      return true
    },
    deleteProperty: function(objectTarget, key) {
      if (key in objectTarget) {
        const value = objectTarget[key]
        delete objectTarget[key]
        hook(value, key, true)
        return true
      }
      return false
    }
  }),
  /**
   * At startup we're going to use this to prevent resaving
   * our data while assigning it to our UI storage
   */
  isReady = false

window.onload = function() {
  getEl('#add-btn').addEventListener('click', () => {
    const tem = template(),
      id = uniqueId()
    tem.id = id
    storage[id] = tem
  })
  const date = new Date()
  getEl('#year').textContent = date.getFullYear()
  getEl('.day-of-month').textContent = date.getDate()
  getEl('#month').textContent = months[date.getMonth()].slice(0, 3)
  getEl('.weekday>span').textContent = weekdays[date.getDay()]
  // Check if we have any saved data
  const todos = localStorage.getItem('todos')
  if (todos) {
    const data = JSON.parse(todos)
    for (const key in data) {
      storage[key] = template(data[key])
    }
  }
  isReady = true
}
/**@type {HTMLElement} */
let display
// Hook
function hook(data, key, isDelete = false) {
  const el = display || getEl('#app>main')
  if (isDelete) {
    el.removeChild(nodes[key])
    delete nodes[key]
  } else {
    const child = createElement(data)
    if (nodes[key]) {
      el.replaceChild(child, nodes[key])
    } else el.appendChild(child)
    nodes[key] = child
  }
  if (isReady) saveToDB(storage)
}
/**
 * Create our DOM element and bind events to it
 * if any
 * @param {{[key:string]:any}} obj
 * @param {HTMLElement|null} parentELement
 * @param {{[key:string]:any}} parentObj
 */
function createElement(obj, parentELement = null, parentObj) {
  const el = document.createElement(obj.type)
  for (const key in obj.attributes) {
    el.setAttribute(key, obj.attributes[key])
  }
  for (const key in obj.events) {
    el.addEventListener(key, obj.events[key].bind(el, parentELement || el, parentObj || obj), false)
  }
  if (Array.isArray(obj.children)) {
    for (const c of obj.children) {
      el.appendChild(createElement(c, parentELement || el, parentObj || obj))
    }
  }
  if (typeof obj.init === 'function') obj.init.call(el, parentELement, parentObj)
  return el
}
function saveToDB(data) {
  const obj = {}
  for (const key in data) obj[key] = pick(data[key], ['editMode', 'done', 'text', 'id'])
  localStorage.setItem('todos', JSON.stringify(obj))
}
function uniqueId() {
  return `id${Date.now()}`
}
/**
 *
 * @param {string} selector
 */
function getEl(selector) {
  return document.querySelector(selector)
}
/**
 *
 * @param {{[key:string]:any}} target
 * @param {string[]} props
 */
function pick(target, props) {
  const obj = {}
  ;(props || []).forEach(prop => (obj[prop] = target[prop]))
  return obj
}
