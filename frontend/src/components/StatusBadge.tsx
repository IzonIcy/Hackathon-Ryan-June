// shows the status as a colored badge thingy

function StatusBadge({ status }: { status: string }) {
  const className = `badge badge-${status}`
  return <span className={className}>{status}</span>
}

export default StatusBadge
