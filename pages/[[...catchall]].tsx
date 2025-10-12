import * as React from "react";
import {
  PlasmicComponent,
  extractPlasmicQueryData,
  ComponentRenderData,
  PlasmicRootProvider,
} from "@plasmicapp/loader-nextjs";
import type { GetStaticPaths, GetStaticProps } from "next";
import Error from "next/error";
import { useRouter } from "next/router";
import { PLASMIC } from "../plasmic-init";

export default function PlasmicLoaderPage(props: {
  plasmicData?: ComponentRenderData;
  queryCache?: Record<string, any>;
}) {
  const { plasmicData, queryCache } = props;
  const router = useRouter();
  
  if (!plasmicData || plasmicData.entryCompMetas.length === 0) {
    // Show a loading state instead of 404 when Plasmic API fails
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Loading...</h1>
        <p>If this persists, please check your Plasmic configuration.</p>
      </div>
    );
  }
  const pageMeta = plasmicData.entryCompMetas[0];
  return (
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      prefetchedQueryData={queryCache}
      pageParams={pageMeta.params}
      pageQuery={router.query}
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicRootProvider>
  );
}

export const getStaticProps: GetStaticProps = async (context) => {
  const { catchall } = context.params ?? {};
  const plasmicPath = typeof catchall === 'string' ? catchall : Array.isArray(catchall) ? `/${catchall.join('/')}` : '/';
  
  try {
    const plasmicData = await PLASMIC.maybeFetchComponentData(plasmicPath);
    if (!plasmicData) {
      // non-Plasmic catch-all
      return { props: {} };
    }
    const pageMeta = plasmicData.entryCompMetas[0];
    // Cache the necessary data fetched for the page
    const queryCache = await extractPlasmicQueryData(
      <PlasmicRootProvider
        loader={PLASMIC}
        prefetchedData={plasmicData}
        pageParams={pageMeta.params}
      >
        <PlasmicComponent component={pageMeta.displayName} />
      </PlasmicRootProvider>
    );
    // Use revalidate if you want incremental static regeneration
    return { props: { plasmicData, queryCache }, revalidate: 60 };
  } catch (error) {
    console.error("Error fetching Plasmic data:", error);
    // Return empty props so the page can still render
    return { props: {} };
  }
}

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const pageModules = await PLASMIC.fetchPages();
    return {
      paths: pageModules.map((mod) => ({
        params: {
          catchall: mod.path.substring(1).split("/"),
        },
      })),
      fallback: "blocking",
    };
  } catch (error) {
    console.error("Error fetching Plasmic pages:", error);
    // Return empty paths and rely on fallback: "blocking" for on-demand generation
    return {
      paths: [],
      fallback: "blocking",
    };
  }
}