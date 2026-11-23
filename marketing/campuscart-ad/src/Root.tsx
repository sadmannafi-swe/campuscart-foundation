import { Composition, Still } from "remotion";
import { CampusCartAd, Thumbnail } from "./Ad";
import { CampusCartAdBn, ThumbnailBn } from "./AdBn";
import timeline from "./timeline.json";
import timelineBn from "./timeline-bn.json";

export const RemotionRoot = () => (
  <>
    <Composition id="CampusCartAd" component={CampusCartAd} durationInFrames={timeline.durationInFrames} fps={timeline.fps} width={1080} height={1920} />
    <Still id="Thumbnail" component={Thumbnail} width={1080} height={1920} />
    <Composition id="CampusCartAdBn" component={CampusCartAdBn} durationInFrames={timelineBn.durationInFrames} fps={timelineBn.fps} width={1080} height={1920} />
    <Still id="ThumbnailBn" component={ThumbnailBn} width={1080} height={1920} />
  </>
);
