const SkeletonLoader = ({
  className = "",
  variant = "default",
  lines = 1,
  width = "100%",
  height = "1rem",
  animate = true,
}) => {
  const baseClasses = `bg-gray-200 rounded ${animate ? "animate-pulse" : ""}`;

  if (variant === "table") {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Table header skeleton */}
        <div className="flex space-x-4">
          <div className={`${baseClasses} h-4 flex-1`}></div>
          <div className={`${baseClasses} h-4 w-24`}></div>
          <div className={`${baseClasses} h-4 w-20`}></div>
          <div className={`${baseClasses} h-4 w-16`}></div>
          <div className={`${baseClasses} h-4 w-12`}></div>
        </div>
        {/* Table rows skeleton */}
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex space-x-4">
            <div className={`${baseClasses} h-4 flex-1`}></div>
            <div className={`${baseClasses} h-4 w-24`}></div>
            <div className={`${baseClasses} h-4 w-20`}></div>
            <div className={`${baseClasses} h-4 w-16`}></div>
            <div className={`${baseClasses} h-4 w-12`}></div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className={`${baseClasses} h-6 w-3/4`}></div>
        <div className={`${baseClasses} h-4 w-full`}></div>
        <div className={`${baseClasses} h-4 w-2/3`}></div>
        <div className="flex space-x-2">
          <div className={`${baseClasses} h-8 w-20`}></div>
          <div className={`${baseClasses} h-8 w-16`}></div>
        </div>
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className={`${baseClasses} h-4 w-24`}></div>
            <div className={`${baseClasses} h-10`} style={{ width }}></div>
          </div>
        ))}
      </div>
    );
  }

  // Default skeleton
  return (
    <div
      className={`${baseClasses} ${className}`}
      style={{ width, height }}
    ></div>
  );
};

export default SkeletonLoader;
