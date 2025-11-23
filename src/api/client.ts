import axios from "axios";

export const api = axios.create({
  baseURL: "https://api-sankhya-fila-conferencia-6bbe82fb50b8.herokuapp.com/", // EXEMPLO, troca pela tua
  timeout: 10000,
});
