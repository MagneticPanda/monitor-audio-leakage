export const getSastDateTime = (date, useDash = true) => {
  const options = {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };
  let sastDateTime = date.toLocaleString("en-ZA", options);
  sastDateTime = useDash ? sastDateTime.replace(/\//g, "-") : sastDateTime;
  sastDateTime = sastDateTime.replace(", ", "T");
  return sastDateTime;
};