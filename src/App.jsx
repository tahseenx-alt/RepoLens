import { Route, Routes, useLocation } from 'react-router'
import SiteHeader from './components/layout/SiteHeader.jsx'
import SiteFooter from './components/layout/SiteFooter.jsx'
import RepoSearchForm from './components/search/RepoSearchForm.jsx'
import HomePage from './pages/HomePage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

// Pages:
//   /              start page with the search form
//   /:owner/:repo  dashboard for one repository (shareable link)
//   anything else  "not found" page
function App() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {/* The start page has its own big search box, so the header one is
          only shown on the other pages. */}
      <SiteHeader>{!isHome && <RepoSearchForm compact />}</SiteHeader>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/:owner/:repo" element={<DashboardPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <SiteFooter />
    </div>
  )
}

export default App
