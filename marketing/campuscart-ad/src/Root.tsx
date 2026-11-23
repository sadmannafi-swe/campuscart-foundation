import { Composition, Still } from "remotion";
import { CampusCartAd, Thumbnail } from "./Ad";
import timeline from "./timeline.json";

export const RemotionRoot = () => (
  <>
    <Composition
      id="CampusCartAd"
      component={CampusCartAd}
      durationInFrames={timeline.durationInFrames}
      fps={timeline.fps}
      width={1080}
      height={1920}
    />
    <Still id="Thumbnail" component={Thumbnail} width={1080} height={1920} />
  </>
);
