import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import FeatureCards from './components/FeatureCards.jsx'
import './App.css'

function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <FeatureCards />
      </main>
      <footer className="footer">
        <div className="container">
          Built by Tahseen Anwer · RepoLens is in development
        </div>
      </footer>
    </>
  )
}

export default App
