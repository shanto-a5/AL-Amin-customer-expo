const { withAndroidManifest, withMainActivity } = require('@expo/config-plugins');

function withNotificationChannel(config) {
  // 1. Add meta-data to AndroidManifest.xml
  config = withAndroidManifest(config, (modConfig) => {
    if (!modConfig.modResults.manifest.$) {
      modConfig.modResults.manifest.$ = {};
    }
    if (!modConfig.modResults.manifest.$['xmlns:tools']) {
      modConfig.modResults.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const mainApplication = modConfig.modResults.manifest.application?.[0];
    if (mainApplication) {
      if (!mainApplication['meta-data']) {
        mainApplication['meta-data'] = [];
      }
      const channelMeta = mainApplication['meta-data'].find(
        (m) => m.$?.['android:name'] === 'com.google.firebase.messaging.default_notification_channel_id'
      );
      if (channelMeta) {
        channelMeta.$['android:value'] = 'allpay_default_channel';
        channelMeta.$['tools:replace'] = 'android:value';
      } else {
        mainApplication['meta-data'].push({
          $: {
            'android:name': 'com.google.firebase.messaging.default_notification_channel_id',
            'android:value': 'allpay_default_channel',
            'tools:replace': 'android:value',
          },
        });
      }
    }
    return modConfig;
  });

  // 2. Add channel creation to MainActivity.kt
  config = withMainActivity(config, (modConfig) => {
    let contents = modConfig.modResults.contents;
    if (!contents.includes('allpay_default_channel')) {
      const channelCreationCode = `
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
      val notificationManager = getSystemService(android.app.NotificationManager::class.java)
      val channel = android.app.NotificationChannel(
        "allpay_default_channel",
        "AllPay BD Notifications",
        android.app.NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "AllPay BD alerts, transactions, and receipts"
        enableLights(true)
        enableVibration(true)
      }
      notificationManager?.createNotificationChannel(channel)
    }
`;
      if (contents.includes('super.onCreate(null)')) {
        contents = contents.replace(
          'super.onCreate(null)',
          'super.onCreate(null)\n' + channelCreationCode
        );
      } else if (contents.includes('super.onCreate(savedInstanceState)')) {
        contents = contents.replace(
          'super.onCreate(savedInstanceState)',
          'super.onCreate(savedInstanceState)\n' + channelCreationCode
        );
      }
      modConfig.modResults.contents = contents;
    }
    return modConfig;
  });

  return config;
}

module.exports = withNotificationChannel;
