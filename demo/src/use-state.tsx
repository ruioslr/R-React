import { h, render } from '../../src/index'

function App() {

  return (
    <div>
      <button>hello Re0</button>
    </div>
  )
}

console.log(<App/>)

render(<App />, document.getElementById("root"));
