const UserCard = ({
  title,
  value,
  subtitle,
  icon,
  color = "bg-blue-500",
  bgColor = "bg-white",
  textColor = "text-gray-900",
  subtitleColor = "text-gray-500",
  showYear = true,
  year = "2024/25",
  customIcon,
  onClick,
  className = "",
  variant = "default", // default, stats, compact, gradient
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "stats":
        return {
          container: `${bgColor} rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow`,
          header: "flex items-center justify-between",
          content: "flex items-center",
          iconContainer: `p-3 rounded-full ${color}`,
          value: "text-2xl font-bold",
          title: "text-sm font-medium text-gray-600",
        };
      case "compact":
        return {
          container: `${bgColor} rounded-lg p-4 border border-gray-200`,
          header: "flex items-center justify-between",
          content: "text-center",
          iconContainer: `w-8 h-8 rounded-full ${color} flex items-center justify-center`,
          value: "text-xl font-semibold",
          title: "text-xs font-medium text-gray-600",
        };
      case "gradient":
        return {
          container:
            "bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-6 border border-indigo-200",
          header: "flex items-center justify-between",
          content: "text-center",
          iconContainer: `w-12 h-12 rounded-full ${color} flex items-center justify-center`,
          value: "text-3xl font-bold text-indigo-600",
          title: "text-sm font-medium text-gray-700",
        };
      default: // original alternating style
        return {
          container:
            "rounded-2xl odd:bg-lamaPurple even:bg-lamaYellow p-4 flex-1 min-w-[130px]",
          header: "flex justify-between items-center",
          content: "",
          iconContainer: "",
          value: "text-2xl font-semibold my-4",
          title: "capitalize text-sm font-medium text-gray-500",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      className={`${styles.container} ${
        onClick ? "cursor-pointer hover:shadow-lg transition-shadow" : ""
      } ${className}`}
      onClick={onClick}
    >
      <div className={styles.header}>
        {showYear && (
          <span className="text-[10px] bg-white px-2 py-1 rounded-full text-green-600">
            {year}
          </span>
        )}
        {customIcon && <img src={customIcon} alt="" width={20} height={20} />}
      </div>

      <div className={styles.content}>
        {icon && (
          <div className={styles.iconContainer}>
            {icon.startsWith("/") ? (
              <img
                src={icon}
                alt={title || "icon"}
                className="w-6 h-6 text-white"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            ) : (
              <span className="text-white text-xl">{icon}</span>
            )}
          </div>
        )}

        <div className={icon ? "ml-4" : ""}>
          {value && <h1 className={`${styles.value} ${textColor}`}>{value}</h1>}
          {title && (
            <h2 className={`${styles.title} ${subtitleColor}`}>{title}</h2>
          )}
        </div>
      </div>

      {subtitle && <p className="text-xs text-gray-400 mt-2">{subtitle}</p>}
    </div>
  );
};

export default UserCard;
