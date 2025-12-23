---
layout: default
title: Blog
permalink: /blog/
---

<h1>บทความทั้งหมด</h1>

<ul>
  {% for post in paginator.posts %}
    <li>
      <span class="post-date">{{ post.date | date: "%b %-d, %Y" }}</span>
      <h3>
        <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
      </h3>
      <p>{{ post.excerpt | strip_html | truncatewords: 30 }}</p>
    </li>
  {% endfor %}
</ul>

{% if paginator.total_pages > 1 %}
<div class="pagination">
  {% if paginator.previous_page %}
    <a href="{{ paginator.previous_page_path | relative_url }}">&laquo; ก่อนหน้า</a>
  {% endif %}

  <span>หน้า {{ paginator.page }} จาก {{ paginator.total_pages }}</span>

  {% if paginator.next_page %}
    <a href="{{ paginator.next_page_path | relative_url }}">ถัดไป &raquo;</a>
  {% endif %}
</div>
{% endif %}
