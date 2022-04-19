package main

import (
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"go.uber.org/ratelimit"
)

var (
	Remaining int64
	numFiles  int
)

func main() {
	rawFile, err := ioutil.ReadFile("gt2017.csv")
	if err != nil {
		log.Fatal(err)
	}
	rows := strings.Split(string(rawFile), "\n")
	var pairs [][]string
	for _, row := range rows {
		pairs = append(pairs, strings.Split(row, ","))
	}
	numFiles = len(pairs)
	log.Println("Downloading", numFiles, "files")

	if _, err := os.Stat("xml_2017"); errors.Is(err, os.ErrNotExist) {
		os.Mkdir("xml_2017", 0777)
	}

	// Download the files
	wg := &sync.WaitGroup{}
	wg.Add(1)
	Remaining = int64(numFiles)
	go downloadRoutine(pairs[:numFiles/3], wg)
	go downloadRoutine(pairs[numFiles/3:(numFiles/3)*2], wg)
	go downloadRoutine(pairs[(numFiles/3)*2:], wg)
	wg.Wait()
	log.Println("Done")
}

func downloadFile(cik, an string) (bool, error) {
	filePath := fmt.Sprintf("xml_2017/%s_%s.xml", cik, an)

	// Check if file exists
	if _, err := os.Stat(filePath); !errors.Is(err, os.ErrNotExist) {
		// File exists
		return false, nil
	}

	url := fmt.Sprintf("https://www.sec.gov/Archives/edgar/data/%s/%s/primary_doc.xml", cik, an)
	log.Println("Downloading", url)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Println("Error creating request")
		return false, err
	}

	req.Header.Add("User-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36")
	req.Header.Add("accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9")
	req.Header.Add("cookie", "ak_bmsc=13AFC76A76B428109003A783CBC4DA2A~000000000000000000000000000000~YAAQn3hGaCTK+wGAAQAAOBROHw9lURiTkjBcpUaLWGw+LspxzV7hZDRhQiiOwyed4MBevQGw2H3WN/84eOMXc7cpxn4ks6MlQDOgHZTPHf5ymP5gdwWCyyXOJ0w46i+yjvdAZOaqdkUboI7+k3RW93891jFBlpIunHSL462f9O563RVvPBp0Uo0X3YMWDLeOYU1N1DphTCdJrl7K9gW4NloenM7vMYA+qExhz1rC6sdzgWive9yywpNbHBFJgCfwuCFgzU60DiI1yFoG+D1dWcdIYsjqBphzwggbMz1VLVEpjAzZQ8TDmtJ/WoF6/1KPHx4Yk4yrchrkVQCJxQpY179J6kfR8zX0cGOA+kAbgZ+ccjg3sfAJSClLQ7ClbD5a8MCN2TYbF2ZrQWBVDeMQlpQcTG5+MYdgJ/+V5X+t5G5WoZnW1o88PxNmG8FXbBtkF1Xdog4XA3YyBearPR4eOmEp7aVduKNqAwh3; bm_mi=BE7AE9627F13D1C5705D6E7F02B5124A~JeMMrZudNNcUzb/7umygbgc/KZvksH2wIreOBtzD4hfVfkOi8nKiWe5rwEYGY9UD1HZj+TBgXusWMUA9+u33I81+j6GNwsWiGQHsZExDwbnwhXQNpu9zbE0dOPzLIFzXRLPYHDBFRBmZ5U3PFv9ABHrayiGKIsdXOzNglpJiMHYeWzO6H91QMORv9PRLFh2YtAVBi0GMaluss7WHwRs4VQs7Ugwvny/cgVyUVpiDKKdgUpYdDN4/GOVMF8bN/s4OpOlr9utf+7L1Uc6l4d1+2DJ4s99y+/QB0hKbS5UsmX5EQ67AgpQ+6L/2GUWGkt7FQOg7wlkg4hNWfjNbc97CGjrkJUn2Wx+jXOvHDNDrTaayQFyAozfmNPXCSInqUcwX; bm_sv=004FF0E8914FAF1F7ACE7CDCA80DEE68~FYAPtTjKlWbI7DqywPHzTW76bQXL9vKiOUfaKdA3zuz7CjitLK1mfDMbftTEF95dypryZnDQdq3w3NltkNVDC9XtQUJUjjJT4TD4lQvPOX/EXJKWbbr5SjPJakTSvigREkxr6yBJCwBNRqnG8rymXQ==")
	req.Header.Add("accept-language", "en-US,en;q=0.9")

	resp, err := http.DefaultClient.Do(req)

	if resp.StatusCode == 429 {
		log.Println("Got status code", resp.StatusCode)
		return false, fmt.Errorf("rl")
	}

	if err != nil {
		log.Println("Error getting", url)
		return true, err
	}

	f, err := os.Create(filePath)
	if err != nil {
		log.Println("Error opening file")
		return false, err
	}
	defer f.Close()

	io.Copy(f, resp.Body)

	return true, nil
}

func downloadRoutine(parts [][]string, wg *sync.WaitGroup) {
	rl := ratelimit.New(3)

	for _, part := range parts {
		shouldWait, err := downloadFile(part[0], strings.Trim(part[1], "\r"))
		if err != nil {
			log.Println("Err donwloading", part[0], part[1])
			log.Println(err)
			if err.Error() == "rl" {
				log.Println("Rate limited, waiting for 10 minutes")
				time.Sleep(time.Minute * 10)
			}
		}
		atomic.AddInt64(&Remaining, -1)
		if shouldWait {
			rl.Take()
			log.Println("Remaining:", Remaining, "/", len(parts)*3)
		}
	}
	wg.Done()
}
