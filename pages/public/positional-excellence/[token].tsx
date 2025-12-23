import * as React from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { fetchLocationByToken, type MobileLocation } from '@/lib/mobile-location';
import { PublicPeaClassicPage } from '@/components/pages/PublicPeaClassicPage';

interface PublicPeaPageProps {
  location: MobileLocation;
  token: string;
}

function PublicPeaPage({ location, token }: PublicPeaPageProps) {
  return (
    <>
      <Head>
        <title>{`Ratings Scorecard | ${location.name ?? 'Levelset'}`}</title>
        <meta
          name="description"
          content={`Positional Excellence ratings scorecard for ${location.name ?? 'this location'}`}
        />
        <link rel="icon" href="/Levelset Icon Non Trans.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <PublicPeaClassicPage location={location} />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<PublicPeaPageProps> = async ({ params }) => {
  const tokenParam = params?.token;
  if (typeof tokenParam !== 'string') {
    return { notFound: true };
  }

  const location = await fetchLocationByToken(tokenParam);

  if (!location) {
    return { notFound: true };
  }

  return {
    props: {
      location,
      token: tokenParam,
    },
  };
};

export default PublicPeaPage;
