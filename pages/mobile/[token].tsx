import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { MobileShell } from '@/components/mobile/MobileShell';

interface MobileLocationRecord {
  id: string;
  name?: string | null;
  location_number?: string | null;
  org_id?: string | null;
  location_mobile_token: string;
}

interface MobilePageProps {
  location: {
    id: string;
    name?: string | null;
    locationNumber?: string | null;
    orgId?: string | null;
    mobileToken: string;
  };
  token: string;
}

export default function MobilePage({ location }: MobilePageProps) {
  return (
    <>
      <Head>
        <title>Levelset Mobile Portal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#31664a" />
        <meta name="description" content="Capture Levelset positional ratings and discipline infractions on the go." />
      </Head>
      <MobileShell location={location} />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<MobilePageProps> = async (context) => {
  const tokenParam = context.params?.token;

  if (typeof tokenParam !== 'string' || tokenParam.trim().length === 0) {
    return { notFound: true };
  }

  const token = tokenParam.trim();
  const supabase = createServerSupabaseClient();

  const { data: location, error } = await supabase
    .from('locations')
    .select('id, name, location_number, org_id, location_mobile_token')
    .eq('location_mobile_token', token)
    .maybeSingle();

  if (error) {
    console.error('[mobile/[token]] Failed to load location for token', token, error);
    return { notFound: true };
  }

  if (!location) {
    return { notFound: true };
  }

  const typedLocation = location as MobileLocationRecord;

  return {
    props: {
      token,
      location: {
        id: typedLocation.id,
        name: typedLocation.name ?? null,
        locationNumber: typedLocation.location_number ?? null,
        orgId: typedLocation.org_id ?? null,
        mobileToken: typedLocation.location_mobile_token,
      },
    },
  };
};

