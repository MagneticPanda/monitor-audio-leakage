const date = new Date();
const dateString = date.toISOString();
console.info(dateString);

// converting to SAST
const utcDate = new Date(dateString);
const sastDate = new Date(utcDate.getTime() + ((60 * 2) * 60 * 1000));
const sastDateString = sastDate.toISOString();
console.info(sastDateString);