interface LoaderCircleProps {
  className?: string;
}

export default function LoaderCircle({ className = "" }: LoaderCircleProps) {
  const normalizedClassName = className.trim();
  const shellClassName = normalizedClassName
    ? `loader-shell font-google ${normalizedClassName}`
    : "loader-shell font-google";

  return (
    <div className={`${shellClassName} my-2`}>
      <div id="loader" />
    </div>
  )
}
