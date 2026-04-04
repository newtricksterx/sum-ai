const theme = localStorage.getItem("theme");
const htmlElement = document.querySelector('html')

if(theme){
  htmlElement?.classList.add(theme);
}
else{
  htmlElement?.classList.add("light");
}

