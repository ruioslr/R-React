import { h, render } from '../../src/index'

function App() {

  return (
    <div>
      <button onClick={() => setCount({} as any)}>{count}</button>
    </div>
  )
}

console.log(<App/>)

render(<App />, document.getElementById("root"));
