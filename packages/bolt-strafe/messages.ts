import type { API, Message, message, TextEmbed } from './deps.ts';

export async function tostrafe(
	message: message,
	sudo = true,
): Promise<Omit<API.DataMessageSend, 'nonce'>> {
	const dat: API.DataMessageSend = {
		attachments: message.attachments && message.attachments.length > 0
			? await Promise.all(
				message.attachments.slice(0, 5).map(async ({ file, name }) => {
					const formdata = new FormData();
					formdata.append(
						'file',
						new File(
							[await (await fetch(file)).arrayBuffer()],
							name || 'file.name',
							{
								type: 'application/octet-stream',
							},
						),
					);
					return (
						await (
							await fetch('https://nebula.strafechat.dev/attachments', {
								method: 'POST',
								body: formdata,
							})
						).json()
					)?.id;
				}),
			)
			: undefined,
		content: message.content
			? message.content
			: message.embeds
			? undefined
			: 'empty message',
		embeds: message.embeds?.map((embed) => {
			if (embed.fields) {
				for (const field of embed.fields) {
					embed.description += `\n\n**${field.name}**\n${field.value}`;
				}
			}
			return embed;
		}),
		sudo: sudo
			? {
				avatar: message.author.profile,
				name: message.author.username.slice(0, 32),
				colour: message.author.color,
			}
			: undefined,
		replies: message.referenceId
			? [{ id: message.referenceId, mention: true }]
			: undefined,
	};

	if (!dat.attachments) delete dat.attachments;
	if (!dat.sudo) delete dat.sudo;
	if (!dat.content) delete dat.content;
	if (!dat.embeds) delete dat.embeds;

	return dat;
}

export function tocore(message: Message): message {
	return {
		author: {
			username: message.member?.displayName ||
				message.author?.username ||
				`${message.authorId || 'unknown user'} on revolt`,
			rawname: message.author?.username ||
				`${message.authorId || 'unknown user'} on revolt`,
			profile: message.author?.avatarURL,
			id: message.authorId || 'unknown',
			color: '#FF4654',
		},
		channel: message.channelId,
		id: message.id,
		timestamp: Temporal.Instant.fromEpochMilliseconds(
			message.createdAt.valueOf(),
		),
		embeds: (message.embeds as TextEmbed[] | undefined)?.map((i) => {
			return {
				icon_url: i.iconUrl ? i.iconUrl : undefined,
				type: 'Text',
				description: i.description ? i.description : undefined,
				title: i.title ? i.title : undefined,
				url: i.url ? i.url : undefined,
			};
		}),
		plugin: 'bolt-strafe',
		reply: async (msg: message, sudo = true) => {
			message.reply(await tostrafe(msg, sudo as boolean));
		},
		attachments: message.attachments?.map(
			({ filename, size, isSpoiler, id, tag }) => {
				return {
					file: `https://nebula.strafechat.dev/${tag}/${id}/${filename}`,
					name: filename,
					spoiler: isSpoiler,
					size: (size || 1) / 1000000,
				};
			},
		),
		content: message.content,
		reply_id: message.replyIds ? message.replyIds[0] : undefined,
	};
}
