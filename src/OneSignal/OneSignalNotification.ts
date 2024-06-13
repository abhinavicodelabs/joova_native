import {onSendTemplateNotification} from '../utils/api';

export const PushNotification = async (data: any) => {
  console.log('DATA ', data);
  const {
    receiverUserId,
    template_id,
    // image,
    sender = '',
    listingTitle = '',
    actionId = '',
    massage = '',
    // sellerAmount = '',
  } = data;

  const body = {
    data: {
      actionId,
      sender,
      // sellerAmount,
      receiverUserId,
      template_id,
      // image,
      listingTitle,
      massage,
    },
    include_external_user_ids: Array.isArray(receiverUserId)
      ? receiverUserId
      : [receiverUserId],
    template_id,
    custom_data: {
      // image,
      sender,
      listingTitle,
      massage,
    },
  };
  await onSendTemplateNotification(body);
};
