import { Component, EventEmitter, OnInit, Output } from '@angular/core'
import { Router } from '@angular/router'
import { CanComponentDeactivate } from '@app/shared/guards/can-deactivate-guard.service'
import { NotificationsService } from 'angular2-notifications'
import { VideoPrivacy, VideoUpdate } from '../../../../../shared/models/videos'
import { AuthService, ServerService } from '../../core'
import { VideoService } from '../../shared/video/video.service'
import { I18n } from '@ngx-translate/i18n-polyfill'
import { FormValidatorService } from '@app/shared/forms/form-validators/form-validator.service'
import { VideoImportService } from '@app/shared/video-import'
import { VideoEdit } from '@app/shared/video/video-edit.model'
import { LoadingBarService } from '@ngx-loading-bar/core'
import { VideoCaptionService } from '@app/shared/video-caption'
import { VideoSend } from '@app/videos/+video-edit/shared/video-send'

@Component({
  selector: 'my-video-import',
  templateUrl: './video-import.component.html',
  styleUrls: [
    './shared/video-edit.component.scss',
    './video-import.component.scss'
  ]
})
export class VideoImportComponent extends VideoSend implements OnInit, CanComponentDeactivate {
  @Output() firstStepDone = new EventEmitter<string>()

  targetUrl = ''
  videoFileName: string

  isImportingVideo = false
  hasImportedVideo = false
  isUpdatingVideo = false

  video: VideoEdit

  protected readonly DEFAULT_VIDEO_PRIVACY = VideoPrivacy.PRIVATE

  constructor (
    protected formValidatorService: FormValidatorService,
    protected loadingBar: LoadingBarService,
    protected notificationsService: NotificationsService,
    protected authService: AuthService,
    protected serverService: ServerService,
    protected videoService: VideoService,
    protected videoCaptionService: VideoCaptionService,
    private router: Router,
    private videoImportService: VideoImportService,
    private i18n: I18n
  ) {
    super()
  }

  ngOnInit () {
    super.ngOnInit()
  }

  canDeactivate () {
    return { canDeactivate: true }
  }

  isTargetUrlValid () {
    return this.targetUrl && this.targetUrl.match(/https?:\/\//)
  }

  importVideo () {
    this.isImportingVideo = true

    const videoUpdate: VideoUpdate = {
      privacy: this.firstStepPrivacyId,
      waitTranscoding: false,
      commentsEnabled: true,
      channelId: this.firstStepChannelId
    }

    this.loadingBar.start()

    this.videoImportService.importVideo(this.targetUrl, videoUpdate).subscribe(
      res => {
        this.loadingBar.complete()
        this.firstStepDone.emit(res.video.name)
        this.isImportingVideo = false
        this.hasImportedVideo = true

        this.video = new VideoEdit(Object.assign(res.video, {
          commentsEnabled: videoUpdate.commentsEnabled,
          support: null,
          thumbnailUrl: null,
          previewUrl: null
        }))
        this.hydrateFormFromVideo()
      },

      err => {
        this.loadingBar.complete()
        this.isImportingVideo = false
        this.notificationsService.error(this.i18n('Error'), err.message)
      }
    )
  }

  updateSecondStep () {
    if (this.checkForm() === false) {
      return
    }

    this.video.patch(this.form.value)

    this.isUpdatingVideo = true

    // Update the video
    this.updateVideoAndCaptions(this.video)
        .subscribe(
          () => {
            this.isUpdatingVideo = false
            this.notificationsService.success(this.i18n('Success'), this.i18n('Video to import updated.'))

            this.router.navigate([ '/my-account', 'video-imports' ])
          },

          err => {
            this.isUpdatingVideo = false
            this.notificationsService.error(this.i18n('Error'), err.message)
            console.error(err)
          }
        )

  }

  private hydrateFormFromVideo () {
    this.form.patchValue(this.video.toFormPatch())
  }
}
