import Head from "next/head";
import SystemState from "@/components/SystemState";

export default function ServerError() {
  function retry() {
    if (window.location.pathname === "/500") window.location.replace("/");
    else window.location.reload();
  }

  return (
    <>
      <Head>
        <title>Ошибка сервера — SmartBus</title>
        <meta name="robots" content="noindex,nofollow" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <style>{"body{margin:0}"}</style>
      </Head>
      <SystemState kind="error" httpStatus={500} onRetry={retry} />
    </>
  );
}
