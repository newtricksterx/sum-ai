const storedTheme = localStorage.getItem("theme");
const theme = storedTheme === "dark" ? "dark" : "light";
const htmlElement = document.documentElement;

htmlElement.classList.toggle("dark", theme === "dark");
htmlElement.classList.toggle("light", theme === "light");
htmlElement.style.colorScheme = theme;
