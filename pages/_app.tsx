import { PLASMIC } from "../plasmic-init";
import "../styles/globals.css";
import "../components/CodeComponents/RosterTable.css";
import type { AppProps } from "next/app";

function MyApp({ Component, pageProps }: AppProps) {
  return PLASMIC && <Component {...pageProps} />;
}

export default MyApp;
