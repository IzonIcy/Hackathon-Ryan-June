// this shows the colored dot for status (wow so fancy)
// TODO: add more statuses when the backend makes up new ones lol

function StatusBadge({ status }: { status: string }) {
  const className = `badge badge-${status}`
  return <span className={className}>{status}</span>
}

export default StatusBadge
