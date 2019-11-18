# frozen_string_literal: true

require 'dotenv/load'
require 'octokit'
require 'logger'

client = Octokit::Client.new access_token: ENV['OCTOKIT_ACCESS_TOKEN']
since = Time.now - (60 * 20)
ignored = %w(stale[bot] jekyllbot dependabot[bot] dependabot-preview[bot])
logger = Logger.new(STDOUT)
notifications = client.notifications(since: since.iso8601)

logger.info "Found #{notifications.count} notification(s)"

notifications.each do |notification|
  author = notification.subject.rels[:self].get.data.user

  if ignored.include?(author.login)
    logger.info "Marking #{notification.subject.title} as read"
    client.mark_thread_as_read(notification.id)
    next
  end

  next unless notification.subject.rels[:latest_comment]

  comment = notification.subject.rels[:latest_comment].get.data
  next unless ignored.include?(comment.user.login)

  logger.info "Marking #{notification.subject.title} as read"
  client.mark_thread_as_read(notification.id)
end
