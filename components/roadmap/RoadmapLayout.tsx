import React from 'react';
import Head from 'next/head';
import styles from './Roadmap.module.css';

interface RoadmapLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function RoadmapLayout({ 
  children, 
  title = 'Levelset Roadmap',
  description = 'Share your ideas, vote on features, and help shape the future of Levelset'
}: RoadmapLayoutProps) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Open Graph */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://roadmap.levelset.io" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Head>
      <div className={styles.pageWrapper}>
        {children}
      </div>
    </>
  );
}
