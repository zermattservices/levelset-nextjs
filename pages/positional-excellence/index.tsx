import { GetServerSideProps } from 'next';

// Redirect /positional-excellence to /positional-excellence/smartview
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/positional-excellence/smartview',
      permanent: false,
    },
  };
};

export default function PositionalExcellenceIndex() {
  // This component will never render due to the redirect
  return null;
}
