import BubbleContainer from '@/components/BubbleContainer';
import WebGLCanvas from '@/components/WebGLCanvas';

export default function Home() {
  return (
    <div className="relative w-full h-screen">
      <WebGLCanvas />
      <div className="relative z-10">
        <BubbleContainer />
      </div>
    </div>
  );
}
