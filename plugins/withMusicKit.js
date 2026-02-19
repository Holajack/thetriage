/**
 * Expo Config Plugin: MusicKit Entitlement
 *
 * Adds the com.apple.developer.musickit entitlement to the iOS build
 * so the app can use Apple MusicKit for authorization and playback.
 *
 * Also adds NSAppleMusicUsageDescription to Info.plist.
 */
const { withEntitlementsPlist, withInfoPlist } = require('expo/config-plugins');

function withMusicKit(config) {
  // Add MusicKit entitlement
  config = withEntitlementsPlist(config, (mod) => {
    mod.modResults['com.apple.developer.musickit'] = true;
    return mod;
  });

  // Add Apple Music usage description to Info.plist
  config = withInfoPlist(config, (mod) => {
    if (!mod.modResults.NSAppleMusicUsageDescription) {
      mod.modResults.NSAppleMusicUsageDescription =
        'HikeWise uses Apple Music to play your playlists during focus sessions.';
    }
    return mod;
  });

  return config;
}

module.exports = withMusicKit;
