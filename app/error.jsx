"use client";
export default function ErrorBoundary({reset}) {
  return <main className="boot-screen"><section className="panel" role="alert"><h1>Workspace could not load</h1><p>Your stored projects have not been intentionally removed. Retry the workspace, or return to the home page. Unsaved in-memory changes may be lost.</p><button onClick={reset}>Retry workspace</button><a href="/">Return home</a></section></main>;
}
