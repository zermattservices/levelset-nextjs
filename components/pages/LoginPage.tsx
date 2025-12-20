import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { LoginPageForm } from '@/components/CodeComponents/auth/LoginPageForm';
import sty from './LoginPage.module.css';
import projectcss from '@/components/plasmic/levelset_v2/plasmic_levelset_v2.module.css';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function LoginPage() {
  const router = useRouter();

  const handleSuccess = async () => {
    router.push('/');
  };

  return (
    <>
      <Head>
        <meta name="twitter:card" content="summary" />
        <title key="title">Levelset Login</title>
        <meta key="og:title" property="og:title" content="Levelset Login" />
        <meta key="twitter:title" name="twitter:title" content="Levelset Login" />
      </Head>

      <style>{`
        body {
          margin: 0;
        }
      `}</style>

      <div
        className={classNames(
          projectcss.all,
          projectcss.root_reset,
          projectcss.plasmic_default_styles,
          projectcss.plasmic_mixins,
          projectcss.plasmic_tokens,
          sty.root
        )}
      >
        <LoginPageForm
          className={classNames("__wab_instance", sty.loginPageForm)}
          onSuccess={handleSuccess}
          showGoogleSignIn={true}
        />
      </div>
    </>
  );
}

export default LoginPage;
