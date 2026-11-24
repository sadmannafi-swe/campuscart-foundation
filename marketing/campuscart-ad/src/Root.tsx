import { Composition, Still } from "remotion";
import { CampusCartAd, Thumbnail } from "./Ad";
import { CampusCartAdBn, ThumbnailBn } from "./AdBn";
import { CampusCartAdBn75, DURATION as DUR75 } from "./AdBn75";
import timeline from "./timeline.json";
import timelineBn from "./timeline-bn.json";
import voEleven from "./vo-bn75-eleven.json";

export const RemotionRoot = () => (
  <>
    <Composition id="CampusCartAd" component={CampusCartAd} durationInFrames={timeline.durationInFrames} fps={timeline.fps} width={1080} height={1920} />
    <Still id="Thumbnail" component={Thumbnail} width={1080} height={1920} />
    <Composition id="CampusCartAdBn" component={CampusCartAdBn} durationInFrames={timelineBn.durationInFrames} fps={timelineBn.fps} width={1080} height={1920} />
    <Composition id="CampusCartAdBn75" component={CampusCartAdBn75} durationInFrames={DUR75} fps={30} width={1080} height={1920} />
    <Composition id="CampusCartAdBn75Eleven" component={CampusCartAdBn75} defaultProps={{ timings: voEleven }} durationInFrames={DUR75} fps={30} width={1080} height={1920} />
    <Still id="ThumbnailBn" component={ThumbnailBn} width={1080} height={1920} />
  </>
);
