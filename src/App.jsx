import { Route, Routes, useLocation } from 'react-router'
import SiteHeader from './components/layout/SiteHeader.jsx'
import SiteFooter from './components/layout/SiteFooter.jsx'
import RepoSearchForm from './components/search/RepoSearchForm.jsx'
import HomePage from './pages/HomePage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

// One app shell with three views:
//   /              start view with the search form
//   /:owner/:repo  dashboard for one repository (shareable link)
//   anything else  "not found" view
function App() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {/* The start view has its own large search box, so the header one is
          only shown elsewhere. `key` resets the form (and any old error
          message) whenever the page changes. */}
      <SiteHeader>{!isHome && <RepoSearchForm key={pathname} compact />}</SiteHeader>
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
