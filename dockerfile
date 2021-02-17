FROM golang:1.15.1-buster
ENV SERVER_PORT=9090
ENV SERVER_DOMAIN="jacob.squizzlezig.com"
WORKDIR /app
COPY ./frontend ./frontend
COPY ./backend ./backend
WORKDIR backend
RUN go mod download
RUN go build -o server .
EXPOSE $SERVER_PORT
CMD ["./server"]