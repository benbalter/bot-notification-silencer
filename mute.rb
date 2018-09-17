require 'dotenv/load'
require 'octokit'
require 'logger'

client = Octokit::Client.new access_token: ENV["OCTOKIT_ACCESS_TOKEN"]
since = Time.now - (60 * 11)
ignored = %w(stale[bot] jekyllbot)
logger = Logger.new(STDOUT)

client.notifications(since: since.iso8601).each do |notification|
  next unless notification.subject.rels[:latest_comment]
  comment = notification.subject.rels[:latest_comment].get.data
  next unless ignored.include?(comment.user.login)
  logger.info "Marking #{notification.subject.title} as read"
  client.mark_thread_as_read(notification.id)
end
