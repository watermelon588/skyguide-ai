import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import { Route, Routes } from 'react-router-dom'
import SocketTest from './pages/SocketTest'
import AuthTest from './pages/AuthTest'

function App() {

  return (
    <>
      <Routes>
        <Route path='/socket-test' element={<SocketTest />} />
        <Route path='/auth-test' element={<AuthTest />} />
      </Routes>
    </>
  )
}

export default App
