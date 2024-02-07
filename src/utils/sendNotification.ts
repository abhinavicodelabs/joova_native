import dayjs from "dayjs";
import { sendNotificationViaTemplate } from "../server/api/onesignal-notification";
import { notifyUser } from "./api";

export const sendPushNotification = (params:any): any => {
    const {data, receiverIds, template_id, custom_data} = params;
    console.log("DATA ", data);
    console.log("receiverIds ", receiverIds);
    console.log("template_id ", template_id);
    console.log("custom_data ", custom_data);
    const body = {
      data,
      include_external_user_ids: receiverIds,
      template_id,
      custom_data,
    };
    sendNotificationViaTemplate(body);
  };

  export const sendNotification = (data:any) => {
    const {
      senderUserId,
      receiverUserId,
      actionName,
      actionId,
      title,
      body,
      icon,
      deviceToken,
      taggedPopsIds = [],
      taggedClapTitle = '',
      taggedClapBody = '',
      displayName = '',
      senderUserName = '',
      senderProfilePic = '',
      listingImageUrl = '',
    } = data;
  
    notifyUser({
      notificationPayload: {
        data: {
          senderUserId,
          receiverUserId,
          actionName,
          actionId,
          timestamp: `${dayjs().unix()}`,
          taggedPopsIds: taggedPopsIds.toString(),
          taggedClapTitle,
          taggedClapBody,
          displayName,
          senderUserName,
          senderProfilePic,
          listingImageUrl,
        },
        notification: {
          title,
          body,
          icon,
        },
      },
      deviceToken,
    });
  };