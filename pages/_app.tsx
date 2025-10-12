import { PLASMIC } from "../plasmic-init";
import "../styles/globals.css";
import "../components/CodeComponents/scoreboard.css";
import "../components/CodeComponents/RosterTable.css";

function MyApp({ Component, pageProps }) {
  return PLASMIC && <Component {...pageProps} />;
}

export default MyApp;