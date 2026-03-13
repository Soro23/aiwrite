FROM postgres:16-alpine

# Copy SSL certificates into the image
COPY ssl/server.crt /etc/postgresql/ssl/server.crt
COPY ssl/server.key /etc/postgresql/ssl/server.key

# Fix ownership and permissions — postgres user (uid 70 on alpine) must own the key
RUN chown 70:70 /etc/postgresql/ssl/server.crt /etc/postgresql/ssl/server.key \
    && chmod 600 /etc/postgresql/ssl/server.key \
    && chmod 644 /etc/postgresql/ssl/server.crt
