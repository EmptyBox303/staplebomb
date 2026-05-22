import {ParseDomain} from "./utils.js";

let currentURL = window.location.href;
let domain = ParseDomain(currentURL);
