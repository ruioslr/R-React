import { h, render } from '../../src/index'

function App() {

  return (
    <div onClick={() => console.log('div')}>
      <button onClick={() => {
          console.log('button');
      }}>hello Re0</button>
    </div>
  )
}

console.log(<App/>)

render(<App />, document.getElementById("root") as any);
