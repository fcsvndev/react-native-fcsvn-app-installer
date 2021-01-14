package com.fcs.rn.installer;

import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;

import android.app.Activity;
import android.app.DownloadManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.res.Resources;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import static android.content.Context.DOWNLOAD_SERVICE;

public class FCSInstallerModule extends ReactContextBaseJavaModule implements LifecycleEventListener {

    final private LinkedBlockingQueue<Runnable> taskQueue = new LinkedBlockingQueue<>();
    final private ThreadPoolExecutor threadPool = new ThreadPoolExecutor(5, 10, 5000, TimeUnit.MILLISECONDS, taskQueue);

    final private ReactApplicationContext mReactContext;
    final private NotificationManagerCompat notificationManager;
    final private Map<Long, NotificationCompat.Builder> notificationBuilderMap = new HashMap<>();
    final private DownloadManager dm;

    private long mCurrentDownloadId = -1;
    private Promise mPromise;

    private BroadcastReceiver onComplete = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            long downloadId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);

            if (downloadId != -1 && mCurrentDownloadId == downloadId) {
                Cursor cursor = dm.query(new DownloadManager.Query().setFilterById(downloadId));
                if (cursor != null && cursor.moveToFirst()) {
                    int status = cursor.getInt(cursor.getColumnIndex(DownloadManager.COLUMN_STATUS));
                    if (status == DownloadManager.STATUS_FAILED) {
                        int reason = cursor.getInt(cursor.getColumnIndex(DownloadManager.COLUMN_REASON));
                        mPromise.reject(Constant.E_DOWNLOAD_FAILED, "download failed with reason = " + reason);
                    } else {
                        String localUri = cursor.getString(cursor.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI));
                        mPromise.resolve(localUri);
                    }
                }
            }
        }
    };

    FCSInstallerModule(ReactApplicationContext context) {
        super(context);
        this.mReactContext = context;
        this.notificationManager = NotificationManagerCompat.from(context);
        this.dm = (DownloadManager) this.mReactContext.getSystemService(DOWNLOAD_SERVICE);
        this.mReactContext.addLifecycleEventListener(this);
        this.mReactContext.registerReceiver(onComplete, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
    }

    @Override
    public void onHostResume() {

    }

    @Override
    public void onHostPause() {

    }

    @Override
    public void onHostDestroy() {
        this.mReactContext.removeLifecycleEventListener(this);
        try {
            this.mReactContext.unregisterReceiver(onComplete);
        } catch (Exception ex) {
            Log.e(Constant.TAG, "[onHostDestroy] error = ", ex);
        }
    }

    @Override
    public String getName() {
        return "FCSInstallerModule";
    }

    @ReactMethod
    public void downloadAndInstall(String url,
                                   String fileName,
                                   ReadableMap notificationConfig,
                                   Promise promise) {
        Log.d(Constant.TAG, "[downloadAndInstall] url = " + url);
        Activity currentActivity = getCurrentActivity();

        if (currentActivity == null) {
            promise.reject(Constant.E_ACTIVITY_DOES_NOT_EXIST, "Activity doesn't exist");
            return;
        }
        mPromise = promise;
        try {
            beginDownload(url, fileName, notificationConfig, promise);
        } catch (Exception ex) {
            Log.e(Constant.TAG, "[downloadAndInstall] error = ", ex);
            mPromise.reject("EUNSPECIFIED", ex.getLocalizedMessage());
        }
    }

    private void beginDownload(String url,
                               String fileName,
                               ReadableMap notificationConfig,
                               final Promise promise) {
        DownloadManager dm = (DownloadManager) this.mReactContext.getSystemService(DOWNLOAD_SERVICE);

        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url))
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                .setTitle("FCS Installer")
                .setDescription(fileName)
                .setAllowedOverMetered(true)
                .setAllowedOverRoaming(true);

        dm.remove(mCurrentDownloadId);

        mCurrentDownloadId = dm.enqueue(request);// enqueue puts the download request in the queue.

        /*NotificationCompat.Builder builder = createNotificationBuilder(fileName, notificationConfig);
        checkOrCreateChannel(notificationManager);
        notificationBuilderMap.put(downloadID, builder);
        publishProgress(0, downloadID, fileName);

        threadPool.execute(new Runnable() {
            @Override
            public void run() {
                executeCheckDownloadStatus(downloadID, promise);
            }
        });*/
    }

    private void executeCheckDownloadStatus(long downloadId, Promise promise) {
        boolean isRunning = true;
        while (isRunning && getCurrentActivity() != null) {
            Cursor cursor = dm.query(new DownloadManager.Query().setFilterById(downloadId));
            if (cursor == null) {
                continue;
            }
            if (cursor.moveToFirst()) {
                int status = cursor.getInt(cursor.getColumnIndex(DownloadManager.COLUMN_STATUS));
                switch (status) {
                    case DownloadManager.STATUS_FAILED: {
                        isRunning = false;
                        int reason = cursor.getInt(cursor.getColumnIndex(DownloadManager.COLUMN_REASON));
                        publishProgress(100, downloadId, "Download failure");
                        promise.reject(Constant.E_DOWNLOAD_FAILED, "download failed with reason = " + reason);
                        break;
                    }
                    case DownloadManager.STATUS_PAUSED:
                    case DownloadManager.STATUS_PENDING:
                        break;
                    case DownloadManager.STATUS_RUNNING: {
                        final long total = cursor.getLong(cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
                        if (total >= 0) {
                            final long downloaded = cursor.getLong(cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
                            int progress = (int) ((downloaded * 100L) / total);
                            publishProgress(progress, downloadId, "Download in progress");
                        }
                        break;
                    }
                    case DownloadManager.STATUS_SUCCESSFUL: {
                        isRunning = false;
                        publishProgress(100, downloadId, "Download complete");
                        String localUri = cursor.getString(cursor.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI));
                        promise.resolve(localUri);
                        break;
                    }
                }
                cursor.close();
            }
        }
    }

    private void publishProgress(int progress, long downloadId, String message) {
        Log.d(Constant.TAG, "[publishProgress] progress = " + progress);
        NotificationCompat.Builder builder = notificationBuilderMap.get(downloadId);
        if (builder != null) {
            builder.setProgress(100, progress, false);
            builder.setContentText(message);
            Notification notification = builder.build();
            notificationManager.notify(String.valueOf(downloadId), 0, notification);
            if (progress == 100) {
                notificationBuilderMap.remove(downloadId);
            }
        }
    }

    private NotificationCompat.Builder createNotificationBuilder(String fileName, ReadableMap notificationConfig) {
        String packageName = mReactContext.getPackageName();
        Resources res = mReactContext.getResources();
        int smallIconResId = res.getIdentifier(notificationConfig.getString("smallIcon"), "mipmap", packageName);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this.mReactContext, Constant.CHANNEL_ID);
        builder.setContentTitle("FCS Installer")
                .setContentText(fileName)
                .setSmallIcon(smallIconResId)
                .setPriority(NotificationCompat.PRIORITY_LOW);
        builder.setProgress(100, 0, false);

        return builder;
    }

    private boolean checkOrCreateChannel(NotificationManagerCompat manager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O)
            return false;
        if (manager == null)
            return false;

        NotificationChannel channel = manager.getNotificationChannel(Constant.CHANNEL_ID);

        if (channel == null) {
            // If channel doesn't exist create a new one.
            // If channel name or description is updated then update the existing channel.
            channel = new NotificationChannel(Constant.CHANNEL_ID, Constant.CHANNEL_NAME, NotificationManager.IMPORTANCE_DEFAULT);

            channel.setDescription(Constant.CHANNEL_DESCRIPTION);

            channel.setSound(null, null);

            manager.createNotificationChannel(channel);
            return true;
        }

        return false;
    }
}
