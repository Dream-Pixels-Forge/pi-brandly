import { Composition, Sequence, Audio, Video } from "remotion";
import Clip_0 from "../assets/shot-1.mp4";
import Clip_1 from "../assets/shot-2.mp4";
import Clip_2 from "../assets/shot-3.mp4";
import Clip_3 from "../assets/shot-4.mp4";
import Clip_4 from "../assets/shot-5.mp4";


const DirectorCut = () => {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "black" }}>
      <Sequence from={0} durationInFrames={90}>
        <Video src={Clip_0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", bottom: "8%", left: "50%", transform: "translateX(-50%)", color: "white", fontSize: 42, fontWeight: "bold", textShadow: "2px 2px 8px rgba(0,0,0,0.7)", fontFamily: "Arial, sans-serif", background: "rgba(0,0,0,0.35)", padding: "6px 20px", borderRadius: 8 }}>— Hook</div>
      </Sequence>
      <Sequence from={90} durationInFrames={120}>
        <Video src={Clip_1} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", bottom: "8%", left: "50%", transform: "translateX(-50%)", color: "white", fontSize: 42, fontWeight: "bold", textShadow: "2px 2px 8px rgba(0,0,0,0.7)", fontFamily: "Arial, sans-serif", background: "rgba(0,0,0,0.35)", padding: "6px 20px", borderRadius: 8 }}>— The Problem</div>
      </Sequence>
      <Sequence from={210} durationInFrames={120}>
        <Video src={Clip_2} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", bottom: "8%", left: "50%", transform: "translateX(-50%)", color: "white", fontSize: 42, fontWeight: "bold", textShadow: "2px 2px 8px rgba(0,0,0,0.7)", fontFamily: "Arial, sans-serif", background: "rgba(0,0,0,0.35)", padding: "6px 20px", borderRadius: 8 }}>— Reveal</div>
      </Sequence>
      <Sequence from={330} durationInFrames={150}>
        <Video src={Clip_3} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", bottom: "8%", left: "50%", transform: "translateX(-50%)", color: "white", fontSize: 42, fontWeight: "bold", textShadow: "2px 2px 8px rgba(0,0,0,0.7)", fontFamily: "Arial, sans-serif", background: "rgba(0,0,0,0.35)", padding: "6px 20px", borderRadius: 8 }}>— The Magic</div>
      </Sequence>
      <Sequence from={480} durationInFrames={120}>
        <Video src={Clip_4} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", bottom: "8%", left: "50%", transform: "translateX(-50%)", color: "white", fontSize: 42, fontWeight: "bold", textShadow: "2px 2px 8px rgba(0,0,0,0.7)", fontFamily: "Arial, sans-serif", background: "rgba(0,0,0,0.35)", padding: "6px 20px", borderRadius: 8 }}>— CTA</div>
      </Sequence>

    </div>
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="MatchaQuick"
      component={DirectorCut}
      durationInFrames={600}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
