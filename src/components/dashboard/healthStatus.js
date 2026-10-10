import { CircleCheck, CircleHelp, LoaderCircle, TriangleAlert } from 'lucide-react'

// Icon and text for each health check status. The text is always shown
// next to the icon, so the status never depends on color alone.
export const HEALTH_STATUS = {
  passed: { Icon: CircleCheck, label: 'Passed' },
  warning: { Icon: TriangleAlert, label: 'Warning' },
  unavailable: { Icon: CircleHelp, label: 'Unavailable' },
  pending: { Icon: LoaderCircle, label: 'Checking' },
}
