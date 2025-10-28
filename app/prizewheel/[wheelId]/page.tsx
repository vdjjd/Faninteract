'use client';

import { useParams } from 'next/navigation';

export default function DebugWheel() {
  const { wheelId } = useParams();
  return (
    <div style={{ color: 'white', background: 'black', height: '100vh' }}>
      <h1>Wheel Debug Page</h1>
      <p>ID: {String(wheelId)}</p>
    </div>
  );
}