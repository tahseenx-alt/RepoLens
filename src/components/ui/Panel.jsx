// A titled section of the dashboard. `actions` sits on the right of the
// title (for example a filter), and `footer` holds notes about the data.
function Panel({ id, title, description, actions, footer, className = '', children }) {
  const headingId = id ? `${id}-title` : undefined
  return (
    <section id={id} className={`panel ${className}`} aria-labelledby={headingId}>
      <header className="panel-header">
        <div className="panel-heading">
          <h2 id={headingId}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="panel-actions">{actions}</div>}
      </header>
      <div className="panel-body">{children}</div>
      {footer && <footer className="panel-footer">{footer}</footer>}
    </section>
  )
}

export default Panel
