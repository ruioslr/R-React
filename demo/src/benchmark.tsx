import { h, render, useReducer, useCallback, useEffect } from '../../src'
function random(max) {
  return Math.round(Math.random() * 1000) % max
}

var startTime
var lastMeasure
var startMeasure = function(name) {
  //console.timeStamp(name);
  startTime = performance.now()
  lastMeasure = name
}
var stopMeasure = function() {
  var last = lastMeasure
  if (lastMeasure) {
    window.setTimeout(function() {
      lastMeasure = null
      var stop = performance.now()
      console.log(last + ' took ' + (stop - startTime))
    }, 0)
  }
}

const A = [
  'pretty',
  'large',
  'big',
  'small',
  'tall',
  'short',
  'long',
  'handsome',
  'plain',
  'quaint',
  'clean',
  'elegant',
  'easy',
  'angry',
  'crazy',
  'helpful',
  'mushy',
  'odd',
  'unsightly',
  'adorable',
  'important',
  'inexpensive',
  'cheap',
  'expensive',
  'fancy'
]
const C = [
  'red',
  'yellow',
  'blue',
  'green',
  'pink',
  'brown',
  'purple',
  'brown',
  'white',
  'black',
  'orange'
]
const N = [
  'table',
  'chair',
  'house',
  'bbq',
  'desk',
  'car',
  'pony',
  'cookie',
  'sandwich',
  'burger',
  'pizza',
  'mouse',
  'keyboard'
]

let nextId = 1

function buildData(count) {
  const data = new Array(count)
  for (let i = 0; i < count; i++) {
    data[i] = {
      id: nextId++,
      label: `${A[random(A.length)]} ${C[random(C.length)]} ${
        N[random(N.length)]
      }`
    }
  }
  return data
}

function listReducer(state, action) {
  const { data, selected } = state
  switch (action.type) {
    case 'RUN':
      return { data: buildData(1000), selected: 0 }
    case 'RUN_LOTS':
      return { data: buildData(10000), selected: 0 }
    case 'ADD':
      return { data: data.concat(buildData(1000)), selected }
    case 'UPDATE':
      const newData = data.slice(0)
      for (let i = 0; i < newData.length; i += 10) {
        const r = newData[i]
        newData[i] = { id: r.id, label: r.label + ' !!!' }
      }
      return { data: newData, selected }
    case 'CLEAR':
      return { data: [], selected: 0 }
    case 'SWAP_ROWS':
      return {
        data: [data[0], data[998], ...data.slice(2, 998), data[1], data[999]],
        selected
      }
    case 'REMOVE':
      const idx = data.findIndex(d => d.id === action.id)
      return { data: [...data.slice(0, idx), ...data.slice(idx + 1)], selected }
    case 'SELECT':
      return { data, selected: action.id }
  }
  return state
}

const GlyphIcon = (
  <span className="glyphicon glyphicon-remove" aria-hidden="true"></span>
)

const Row = ({ selected, item, dispatch }) => {
  const select = useCallback(
      () => dispatch({ type: 'SELECT', id: item.id }),
      []
    ),
    remove = useCallback(() => dispatch({ type: 'REMOVE', id: item.id }), [])

  return (
    <tr className={selected ? 'danger' : ''}>
      <td className="col-md-1">{item.id}</td>
      <td className="col-md-4">
        <a onClick={select}>{item.label}</a>
      </td>
      <td className="col-md-1">
        <a onClick={remove}>{GlyphIcon}</a>
      </td>
      <td className="col-md-6"></td>
    </tr>
  )
}

const Button = ({ id, cb, title }) => {
  const onClick = () => {
    startMeasure(id)
    cb()
  }

  return (
    <div className="col-sm-6 smallpad">
      <button
        type="button"
        className="btn btn-primary btn-block"
        id={id}
        onClick={onClick}
      >
        {title}
      </button>
    </div>
  )
}

const Jumbotron = ({ dispatch }) => (
  <div className="jumbotron">
    <div className="row">
      <div className="col-md-6">
        <h1>Fre keyed</h1>
      </div>
      <div className="col-md-6">
        <div className="row">
          <Button
            id="run"
            title="Create 1,000 rows"
            cb={() => dispatch({ type: 'RUN' })}
          />
          <Button
            id="runlots"
            title="Create 10,000 rows"
            cb={() => dispatch({ type: 'RUN_LOTS' })}
          />
          <Button
            id="add"
            title="Append 1,000 rows"
            cb={() => dispatch({ type: 'ADD' })}
          />
          <Button
            id="update"
            title="Update every 10th row"
            cb={() => dispatch({ type: 'UPDATE' })}
          />
          <Button
            id="clear"
            title="Clear"
            cb={() => dispatch({ type: 'CLEAR' })}
          />
          <Button
            id="swaprows"
            title="Swap Rows"
            cb={() => dispatch({ type: 'SWAP_ROWS' })}
          />
        </div>
      </div>
    </div>
  </div>
)

const Main = () => {
  const [state, dispatch] = useReducer(listReducer, { data: [], selected: 0 })

  useEffect(stopMeasure)

  return (
    <div className="container">
      <Jumbotron dispatch={dispatch} />
      <table className="table table-hover table-striped test-data">
        <tbody>
          {state.data.map(item => (
            <Row
              key={item.id}
              item={item}
              selected={state.selected === item.id}
              dispatch={dispatch}
            />
          ))}
        </tbody>
      </table>
      <span
        className="preloadicon glyphicon glyphicon-remove"
        aria-hidden="true"
      ></span>
    </div>
  )
}

render(<Main />, document.getElementById('root'))
