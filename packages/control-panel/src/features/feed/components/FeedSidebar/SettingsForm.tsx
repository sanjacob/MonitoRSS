import {
  Button,
  Flex,
  FormControl, FormHelperText, FormLabel, HStack, Stack, Text,
} from '@chakra-ui/react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { InferType, object, string } from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { ThemedSelect } from '@/components';
import { useFeed } from '../../hooks';
import { useDiscordServer } from '@/features/discordServers';
import { useDiscordWebhooks } from '@/features/discordWebhooks';
import { getFeed, updateFeed } from '../../api';
import { notifySuccess } from '@/utils/notifySuccess';

const formSchema = object({
  webhookId: string().optional(),
});

type FormData = InferType<typeof formSchema>;

interface Props {
  feedId: string
  serverId: string
}

export const SettingsForm: React.FC<Props> = ({
  feedId,
  serverId,
}) => {
  const { t } = useTranslation();
  const {
    feed,
  } = useFeed({
    feedId,
  });
  const {
    data: discordServerData,
    status: discordServerStatus,
  } = useDiscordServer({ serverId });
  const { data: discordWebhooks, status: discordWebhooksStatus } = useDiscordWebhooks({
    serverId,
    isWebhooksEnabled: discordServerData?.benefits.webhooks,
  });

  const {
    handleSubmit,
    control,
    reset,
    formState: {
      isDirty,
      isSubmitting,
    },
  } = useForm<FormData>({
    resolver: yupResolver(formSchema),
    defaultValues: {
      webhookId: feed?.webhook?.id || '',
    },
  });

  const onSubmit = async (formData: FormData) => {
    await updateFeed({
      feedId,
      details: {
        webhookId: formData.webhookId,
      },
    });
    const updatedFeed = await getFeed({
      feedId,
    });
    await notifySuccess(t('features.feed.components.sidebar.updateSuccess'));
    reset({
      webhookId: updatedFeed.result.webhook?.id || '',
    });
  };

  if (!feed || !discordServerData) {
    return null;
  }

  const webhooksDisabled = discordServerStatus !== 'success'
  || !discordServerData?.benefits.webhooks;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={6}>
        <FormControl>
          <FormLabel htmlFor="webhook">
            {t('features.feed.components.sidebar.webhookFormLabel')}

          </FormLabel>
          <Controller
            name="webhookId"
            control={control}
            render={({ field }) => (
              <ThemedSelect
                loading={discordWebhooksStatus === 'loading'}
                isDisabled={webhooksDisabled || isSubmitting}
                isClearable
                options={discordWebhooks?.map((webhook) => ({
                  label: webhook.name,
                  value: webhook.id,
                  icon: webhook.avatarUrl,
                })) || []}
                onChange={field.onChange}
                onBlur={field.onBlur}
                value={field.value}
                ref={field.ref}
              />
            )}
          />
          <FormHelperText>
            {!webhooksDisabled
                  && t('features.feed.components.sidebar.webhooksInputHelperText')}
            {webhooksDisabled && (
            <Text color="orange.500">
              {t('features.feed.components.sidebar.webhooksPremiumDisabled')}
            </Text>
            )}
          </FormHelperText>
        </FormControl>
        <Flex justifyContent="flex-end">
          <HStack>
            <Button
              onClick={() => reset()}
              disabled={!isDirty || isSubmitting}
            >
              Reset
            </Button>
            <Button
              type="submit"
              colorScheme="blue"
              disabled={isSubmitting || !isDirty}
            >
              Save
            </Button>
          </HStack>
        </Flex>
      </Stack>
    </form>
  );
};
